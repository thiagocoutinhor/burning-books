import React, { useState, useEffect, useRef, useContext } from 'react'
import { useParams, useHistory, Link } from 'react-router-dom'
import { Navbar, Dropdown, Card, Button, Form, InputGroup, Spinner } from 'react-bootstrap'
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

///////////////////////////////////////////////////////////////////////////////
// Connection Context
///////////////////////////////////////////////////////////////////////////////

const connectionStatusList = {
    disconnected: {
        class: 'disconnected',
        showControls: true,
        ready: false
    },
    connecting: {
        class: 'connecting',
        showControls: false,
        ready: false
    },
    connected: {
        class: 'connected',
        showControls: false,
        ready: true
    },
    running: {
        class: 'running',
        showControls: false,
        ready: false
    },
}

const SparkContext = React.createContext(null)

///////////////////////////////////////////////////////////////////////////////
// Connection widget
///////////////////////////////////////////////////////////////////////////////

function ConnectionControl(props) {
    const spark = useContext(SparkContext)
    const executors = useRef()
    const cores = useRef()
    const memory = useRef()

    const connect = () => {
        spark.connect(executors.current.value, cores.current.value, memory.current.value)
    }

    return (
        <Form inline {...props} className={`${props.className} p-2 connection-control ${spark.status.class}`}>
            { spark.status.showControls ? [executors, cores, memory].map((control, index) => (
                <InputGroup size="sm" className="mr-2" key={index}>
                    <InputGroup.Prepend>
                        <InputGroup.Text>Executors</InputGroup.Text>
                    </InputGroup.Prepend>
                    <Form.Control ref={control} type="number" defaultValue="2" className="text-center" min="1" style={{ width: '4em' }}></Form.Control>
                </InputGroup>
            )).concat((
                <Button size="sm" className="mr-2" onClick={connect} key="connectButton">Connect</Button>
            )) : null }
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown} disabled={spark.status !== connectionStatusList.connected}>
                    <div className="connection-icon">
                        <FontAwesomeIcon icon="wifi" />
                    </div>
                </Dropdown.Toggle>
                { spark.status === connectionStatusList.connected ? (
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

///////////////////////////////////////////////////////////////////////////////
// Navbar
///////////////////////////////////////////////////////////////////////////////
function EditorNavbar(props) {
    const copyAll = () => {
        // TODO something
    }

    return (
        <Navbar variant="dark" className="sticky-top d-flex shadow">
            <Navbar.Brand>
                <Link to="/">
                    <FontAwesomeIcon icon="chevron-left"/>
                </Link>
                <span className="ml-1">
                    { props.book.name }
                </span>
            </Navbar.Brand>
            <div className="flex-grow-1"/>
            <ConnectionControl socket={props.socket} className="mr-2"/>
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    <FontAwesomeIcon icon="ellipsis-v"/>
                </Dropdown.Toggle>
                <Dropdown.Menu >
                    <Dropdown.Item onClick={copyAll}>
                        <FontAwesomeIcon icon="clone" className="mr-2"/>
                        Copy all blocks
                    </Dropdown.Item>
                    <Dropdown.Item href={`/api/book/${props.book._id}/download`} download={`${props.book.name}.scala`}>
                        <FontAwesomeIcon icon="file-download" className="mr-2" />
                        Download
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </Navbar>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Chunk editor
///////////////////////////////////////////////////////////////////////////////
function ChunkEditor(props) {
    return (
        <Card.Body as={AceEditor}
            name={`Chunk-${props.index}`}
            value={props.command}
            onChange={props.codeChange}
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
                    exec: props.run
                },
                {
                    name: 'run-all',
                    bindKey: {
                        win: 'Control-Shift-Enter',
                        mac: 'Command-shift-enter'
                    },
                    exec: props.runAllAbove
                }
            ]}
            style={{
                width: '100%'
            }}
        ></Card.Body>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Chunk
///////////////////////////////////////////////////////////////////////////////

// List of possible status that the chunk can have
// - Order of the status on the statemachine
// - Label of the state
// - Style to be applied to the status text
// - If this status recieves commands (can be run)
const chunkStatusList = {
    waiting: {
        name: 'waiting',
        order: 0,
        label: 'Waiting connection...',
        style: { color: 'gray' },
        ready: false,
        buttonVariant: "secondary",
        buttonIcon: "play"
    },
    ready: {
        name: 'ready',
        order: 1,
        label: 'Ready',
        style: {},
        ready: true,
        buttonVariant: "primary",
        buttonIcon: "play"
    },
    running: {
        name: 'running',
        order: 2,
        label: 'Running...',
        style: { color: 'blue' },
        ready: false,
        buttonVariant: "secondary",
        buttonIcon: "hourglass"
    },
    done: {
        name: 'done',
        order: 3,
        label: 'Done',
        style: { color: 'green', fontWeight: 'bold' },
        ready: true,
        buttonVariant: "success",
        buttonIcon: "play"
    },
    changed: {
        name: 'changed',
        order: 4,
        label: 'Changed',
        style: { color: 'green' },
        ready: true,
        buttonVariant: "success",
        buttonIcon: "play"
    }
}

// Each code chunk
function CommandChunk(props) {
    const [command, setCommand] = useState(props.chunk.command)
    const [status, setStatus] = useState(chunkStatusList.waiting)
    const [ready, setReady] = useState(false)
    const [buttonVariant, setButtonVariant] = useState("secondary")
    const [result, setResult] = useState('')
    const spark = useContext(SparkContext)
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

    // Capture connected status change
    useEffect(() => {
        if (spark.status === connectionStatusList.connected) {
            if (status.order < chunkStatusList.ready.order) {
                setStatus(chunkStatusList.ready)
            }
        } else if (spark.status === connectionStatusList.disconnected) {
            setStatus(chunkStatusList.waiting)
        }
    }, [spark.status])

    // Checks the chunk readiness and the overall readiness
    useEffect(() => {
        const isReady = spark.status.ready && status.ready
        setReady(isReady)
        if (isReady) {
            setButtonVariant(status.buttonVariant)
        } else {
            setButtonVariant("secondary")
        }
    }, [spark.status, status])

    const startNameEdit = () => {
        nameRef.current.innerText = props.chunk.name || ''
        nameRef.current.focus()
    }

    const editName = () => {
        const name = nameRef.current.innerText
            .replace(/\n/g, ' ')
            .replace('Unamed', '')
            .trim()
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
        if (ready) {
            setStatus(chunkStatusList.running)

            let tmpResult = ''
            const doReturn = data => {
                tmpResult += data
                setResult(tmpResult)
            }

            const doFinish = (data, isError) => {
                setStatus(chunkStatusList.done)
                spark.socket.off('return.stream', doReturn)
            }

            spark.socket.on('return.stream', doReturn)
            spark.socket.once('return', data => doFinish(data, false))
            spark.socket.once('return.error', data => doFinish(data, true))

            spark.run(command)
            setStatus(chunkStatusList.running)
        }
    }

    const runAllAbove = () => {
        // TODO something
        // TODO how???
    }

    return (
        <div>
            <ChunkAddButton at={props.index} bookSocket={props.bookSocket} />
            <div className={`command-block ${status.name} ml-3 mr-3`}>
                <Card>
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
                            <FontAwesomeIcon icon="ellipsis-v" />
                        </span>
                    </Card.Header>
                    <ChunkEditor index={props.index} command={command} codeChange={codeChange} run={run} runAllAbove={runAllAbove} />
                    <Card.Footer className="d-flex align-items-end">
                        <span className="chunk-status" style={{fontSize: '80%' ,...status.style}}>{status.label}</span>
                        <span className="flex-grow-1"></span>
                        <Button className="run-button" disabled={!ready} variant={buttonVariant} onClick={run} style={{ verticalAlign: "middle" }}>
                            <FontAwesomeIcon icon={status.buttonIcon} />
                        </Button>
                    </Card.Footer>
                </Card>
                <CommandResult result={result}/>
            </div>
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Chunk result
///////////////////////////////////////////////////////////////////////////////
function CommandResult(props) {
    return props.result
}

///////////////////////////////////////////////////////////////////////////////
// Button to add new chunk at a given position
///////////////////////////////////////////////////////////////////////////////
function ChunkAddButton(props) {
    const add = () => {
        props.bookSocket.emit('chunk.new', props.at)
    }

    return (
        <div className="chunk-add-button mr-3 ml-3 mt-2 mb-2" onClick={add}>
            <FontAwesomeIcon icon="plus" />
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
    const [spark, setSpark] = useState({
        status: connectionStatusList.disconnected,
        socket: null,
        connect: (executors, cores, memory) => {
            spark.socket = io(`/spark?executors=${executors}&cores=${cores}&memory=${memory}`)
            setSpark({ status: connectionStatusList.connecting })

            spark.socket.on('ready', () => {
                setSpark({ ...spark, status: connectionStatusList.connected })
            })
            // TODO something
        },
        disconnect: () => {
            spark.socket.disconnect()
            setSpark({ ...spark, status: connectionStatusList.disconnected })
        },
        run: command => {
            spark.socket.once('return', () => setSpark({ ...spark, status: connectionStatusList.connected }))
            spark.socket.emit('run', command)
            setSpark({ ...spark, status: connectionStatusList.running })
        }
    })
    const bookSocketRef = useRef(null)
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
        <SparkContext.Provider value={spark}>
            <LoadingHome loading={loading}>
                <EditorNavbar book={book} />
                { ((book && book.commands) || []).map((chunk, index) => <CommandChunk chunk={chunk} key={chunk._id} index={index} bookSocket={bookSocketRef.current} />)}
                <ChunkAddButton bookSocket={bookSocketRef.current} />
            </LoadingHome>
        </SparkContext.Provider>
    )
}