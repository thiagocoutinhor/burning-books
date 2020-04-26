import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
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
import "ace-builds/src-noconflict/snippets/scala";

// Navbar
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
    const [status, setStatus] = useState(chunkStatusList.waiting)

    const codeChange = value => {
        // TODO something
        if (status.order >= chunkStatusList.done.order) {
            setStatus(chunkStatusList.changed)
        }
        console.log(value)
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
        <Card className="m-3 shadow command-block">
            <Card.Header className="d-flex">
                <div>
                    [Chunk {props.index}] {props.command.name}
                </div>
                <span className="flex-grow-1"></span>
                <span>
                    <i className="fa fa-ellipsis-v"></i>
                </span>
            </Card.Header>
            <Card.Body as={AceEditor}
                name={`Chunk-${props.index}`}
                value={props.command.command}
                onChange={codeChange}
                mode="scala"
                theme="textmate"
                setOptions={{
                    maxLines: Infinity,
                    minLines: 5,
                    showPrintMargin: false,
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: false,
                    enableSnippets: true,
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
                <span className="chunk-status" style={status.style}>{status.label}</span>
                <span className="flex-grow-1"></span>
                <Button disabled onClick={run}>
                    <i className="fa fa-play"></i>
                </Button>
            </Card.Footer>
        </Card>
    )
}

// Main editor view component
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
            { book ? book.commands.map((command, index) => <CommandChunk command={command} key={index} index={index} bookSocket={bookSocketRef.current} />) : null }
        </LoadingHome>
    )
}