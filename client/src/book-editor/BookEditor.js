import React, { useState, useEffect, useRef } from 'react'
import { useParams, useHistory, Link } from 'react-router-dom'
import { Navbar, Dropdown, Card, Button } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'
import { LoadingHome } from '../app/App'
import AceEditor from 'react-ace'
import './BookEditor.css'

// Ace editor imports
import "ace-builds/src-noconflict/mode-scala"
import "ace-builds/src-noconflict/theme-textmate"
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";

///////////////////////////////////////////////////////////////////////////////
// Navbar
///////////////////////////////////////////////////////////////////////////////
function EditorNavbar(props) {
    const copyAll = () => {
        // TODO something
    }

    // TODO add connection components

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

///////////////////////////////////////////////////////////////////////////////
// Chunk
///////////////////////////////////////////////////////////////////////////////

// List of possible status that the chunk can have
// - Order of the status on the statemachine
// - Label of the state
// - Style to be applied to the status text
const chunkStatusList = {
    waiting: {
        order: 0,
        label: 'Waiting connection...',
        style: { color: 'gray' }
    },
    ready: {
        order: 1,
        label: 'Ready',
        style: {}
    },
    running: {
        order: 2,
        label: 'Running...',
        style: { color: 'blue' }
    },
    done: {
        order: 3,
        label: 'Done',
        style: { color: 'green', fontWeight: 'bold' }
    },
    changed: {
        order: 4,
        label: 'Changed',
        style: { color: 'green' }
    }
}

// Each code chunk
function CommandChunk(props) {
    const [command, setCommand] = useState(props.chunk.command)
    const [status, setStatus] = useState(chunkStatusList.waiting)
    // TODO todos marcados como changed... :/
    const saveTimer = useRef(null)
    const nameRef = useRef(null)

    // Name change
    useEffect(() => {
        nameRef.current.innerText = props.chunk.name || 'Unamed'
    }, [props.chunk.name])

    // Command status validation
    // Changes after the chunk was run mark it as changed
    useEffect(() => {
        if (status.order >= chunkStatusList.done.order) {
            setStatus(chunkStatusList.changed)
        }
    }, [command])

    // Command change
    useEffect(() => {
        setCommand(props.chunk.command)
    }, [props.chunk.command])

    const startNameEdit = () => {
        nameRef.current.innerText = props.chunk.name || ''
        nameRef.current.focus()
    }

    const editName = () => {
        const name = nameRef.current.innerText.replace(/\n/g, ' ').trim()
        if (name === '') {
            nameRef.current.innerText = 'Unamed'
        }
        props.bookSocket.emit('chunk.name', props.index, name === '' ? undefined : name)
    }

    const treatName = event => {
        const shouldIgnore = event.key === 'Enter'
            || (event.ctrlKey && ['B', 'b', 'I', 'i', 'u', 'U'].includes(event.key))
        if (shouldIgnore) {
            event.preventDefault()
        }
    }

    // Changes made during user edition
    const codeChange = value => {
        setCommand(value)
        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
        }
        saveTimer.current = setTimeout(() => {
            props.bookSocket.emit('chunk.update', props.index, value)
        }, 1000) // Saves after a second without changes
    }

    const run = () => {
        // TODO something
        console.log('executou esse...')
    }

    const runAllAbove = () => {
        // TODO something
        console.log('executou todos acima...')
    }

    return (
        <div className="command-block">
            <ChunkAddButton at={props.index} bookSocket={props.bookSocket} />
            <Card className="ml-3 mr-3 shadow">
                <Card.Header className="d-flex align-items-start">
                    <span onClick={startNameEdit} className="pointer">
                        [Chunk {props.index}]
                        <span
                            ref={nameRef}
                            contentEditable
                            spellCheck={false}
                            className="chunk-name ml-1 pr-1 pl-1"
                            onBlur={editName}
                            onKeyDown={treatName}
                            style={{
                                color: props.chunk.name ? 'gray' : 'rgba(128, 128, 128, 0.4)'
                            }}
                        >
                        </span>
                    </span>
                    <span className="flex-grow-1"></span>
                    <span>
                        <i className="fa fa-ellipsis-v"></i>
                    </span>
                </Card.Header>
                <Card.Body as={AceEditor}
                    name={`Chunk-${props.index}`}
                    value={command}
                    onChange={codeChange}
                    mode="scala"
                    theme="textmate"
                    setOptions={{
                        maxLines: Infinity,
                        minLines: 5,
                        showPrintMargin: false,
                        enableBasicAutocompletion: true,
                        showLineNumbers: false,
                        useSoftTabs: true,
                        tabSize: 2
                    }}
                    commands={[
                        {
                            name: 'run',
                            bindKey: {
                                win: 'Ctrl-Enter',
                                mac: 'Command-Enter',
                            },
                            exec: run
                        },
                        {
                            name: 'run-all',
                            bindKey: {
                                win: 'Control-Shift-Enter',
                                mac: 'Command-shift-enter'
                            },
                            exec: runAllAbove
                        }
                    ]}
                    style={{
                        width: '100%'
                    }}
                ></Card.Body>
                <Card.Footer className="d-flex align-items-end">
                    <span className="chunk-status" style={{fontSize: '80%' ,...status.style}}>{status.label}</span>
                    <span className="flex-grow-1"></span>
                    <Button disabled onClick={run}>
                        <i className="fa fa-play"></i>
                    </Button>
                </Card.Footer>
            </Card>
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Button to add new chunk at a position
///////////////////////////////////////////////////////////////////////////////
function ChunkAddButton(props) {
    const add = () => {
        props.bookSocket.emit('chunk.new', props.at)
    }

    return (
        <div className="chunk-add-button mr-3 ml-3 mt-2 mb-2" onClick={add}>
            <i className="fa fa-plus"></i>
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Book Editor
///////////////////////////////////////////////////////////////////////////////
export function BookEditor(props) {
    const { bookId } = useParams()
    const [loading, setLoading] = useState(true)
    const [book, setBook] = useState(null)
    const bookSocketRef = useRef(null)
    const sparkSocketRef = useRef(null)
    const history = useHistory()

    useEffect(() => {
        console.debug('Connecting to book socket')
        bookSocketRef.current = io(`/book?id=${bookId}`)

        // Recieves the book
        bookSocketRef.current.on('book', book => {
            setBook(book)
            setLoading(false)
        })

        // Leave teh current book as ordered
        bookSocketRef.current.on('exit', () => history.push('/'))

        return () => {
            console.debug('Disconnecting from book socket')
            bookSocketRef.current.disconnect()
        }
    }, [bookId, history])

    return (
        <LoadingHome loading={loading}>
            <EditorNavbar book={book}/>
            { ((book && book.commands) || []).map((chunk, index) => <CommandChunk chunk={chunk} key={chunk._id} index={index} bookSocket={bookSocketRef.current} />)}
            <ChunkAddButton bookSocket={bookSocketRef.current} />
        </LoadingHome>
    )
}