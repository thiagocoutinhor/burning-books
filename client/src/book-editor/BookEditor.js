import React, { useState, useEffect, useRef, useContext } from 'react'
import PropTypes from 'prop-types'
import { useParams, useHistory, Link } from 'react-router-dom'
import { Navbar, Dropdown, Card, Button, Form, InputGroup, ProgressBar, Table } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'
import { LoadingHome } from '../app/App'
import AceEditor from 'react-ace'
import moo from 'moo'
import './BookEditor.css'

// Ace editor imports
import 'ace-builds/src-noconflict/mode-scala'
import 'ace-builds/src-noconflict/theme-textmate'
import 'ace-builds/src-min-noconflict/ext-searchbox'
import 'ace-builds/src-min-noconflict/ext-language_tools'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

///////////////////////////////////////////////////////////////////////////////
// General use, helper functions
///////////////////////////////////////////////////////////////////////////////

function chunkCopytext(index, chunk) {
    const comment = `${'/'.repeat(80)}\n// BLOCK ${index}${chunk.name ? ' - ' + chunk.name : ''}\n${'/'.repeat(80)}\n\n`
    return `${comment}${chunk.command}`
}

function doCopy(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
    } else {
        const helper = document.createElement('textarea')
        helper.value = text
        document.body.appendChild(helper)
        helper.select()
        document.execCommand('copy')
        document.body.removeChild(helper)
    }
}

function editablePrevent(event) {
    const shouldIgnore = event.key === 'Enter'
        || (event.ctrlKey && ['B', 'b', 'I', 'i', 'u', 'U'].includes(event.key))
    if (shouldIgnore) {
        event.preventDefault()
    }
}

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
// Book Bane
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
        if (name != '') {
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
function EditorNavbar({ book, copyAll, socket }) {

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

///////////////////////////////////////////////////////////////////////////////
// Chunk options
///////////////////////////////////////////////////////////////////////////////
ChunkOptions.propTypes = {
    index: PropTypes.number,
    copy: PropTypes.func,
    runAllAbove: PropTypes.func,
    remove: PropTypes.func,
}
function ChunkOptions({ index, copy, runAllAbove, remove}) {
    const spark = useContext(SparkContext)

    return (
        <Dropdown drop="left">
            <Dropdown.Toggle as={SimpleDropdown}>
                <div className="text-right p-2">
                    <FontAwesomeIcon icon="ellipsis-v" />
                </div>
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item onClick={copy}>
                    <FontAwesomeIcon icon="clone" className="mr-2"/>
                    Copy
                </Dropdown.Item>
                { index > 0 ? (
                    <Dropdown.Item as="button" onClick={runAllAbove} disabled={!spark.status.ready}>
                        <FontAwesomeIcon icon="play" className="mr-2"/>
                        Run all above
                    </Dropdown.Item>
                ) : null }
                <Dropdown.Divider />
                <Dropdown.Item onClick={remove}>
                    <FontAwesomeIcon icon="trash" className="mr-2" style={{ color: 'red' }}/>
                    Remove
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Chunk editor
///////////////////////////////////////////////////////////////////////////////

ChunkEditor.propTypes = {
    index: PropTypes.number,
    command: PropTypes.string,
    codeChange: PropTypes.func,
    run: PropTypes.func,
    runAllAbove: PropTypes.func
}
function ChunkEditor({ index, command, codeChange, run, runAllAbove }) {
    return (
        <Card.Body as={AceEditor}
            name={`Chunk-${index}`}
            value={command}
            onChange={codeChange}
            mode="scala"
            theme="textmate"
            setOptions={{
                maxLines: Infinity,
                minLines: 5,
                showPrintMargin: false,
                enableBasicAutocompletion: true,
                // showLineNumbers: false,
                useSoftTabs: true,
                tabSize: 2
            }}
            commands={[
                {
                    name: 'run',
                    bindKey: {
                        win: 'Control-Enter',
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
        executed: false,
        buttonVariant: 'secondary',
        buttonIcon: 'play'
    },
    ready: {
        name: 'ready',
        order: 1,
        label: 'Ready',
        style: {},
        ready: true,
        executed: false,
        buttonVariant: 'primary',
        buttonIcon: 'play'
    },
    running: {
        name: 'running',
        order: 2,
        label: 'Running...',
        style: { color: 'blue' },
        ready: false,
        executed: false,
        buttonVariant: 'secondary',
        buttonIcon: 'hourglass'
    },
    done: {
        name: 'done',
        order: 3,
        label: 'Done',
        style: { color: 'green', fontWeight: 'bold' },
        ready: true,
        executed: true,
        buttonVariant: 'success',
        buttonIcon: 'play'
    },
    changed: {
        name: 'changed',
        order: 4,
        label: 'Changed',
        style: { color: 'green' },
        ready: true,
        executed: true,
        buttonVariant: 'primary',
        buttonIcon: 'play'
    }
}

// Each code chunk
CommandChunk.propTypes = {
    index: PropTypes.number,
    chunk: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        command: PropTypes.string
    }),
    bookSocket: PropTypes.object,
}
function CommandChunk({ index, chunk, bookSocket}) {
    const [command, setCommand] = useState(chunk.command)
    const [status, setStatus] = useState(chunkStatusList.waiting)
    const [ready, setReady] = useState(false)
    const [buttonVariant, setButtonVariant] = useState('secondary')
    const [result, setResult] = useState('')
    const spark = useContext(SparkContext)
    const saveTimer = useRef(null)
    const nameRef = useRef(null)

    // Name change
    useEffect(() => {
        nameRef.current.innerText = chunk.name || 'Unamed'
    }, [chunk.name])

    // Command status validation
    // Changes after the chunk was run mark it as changed
    useEffect(() => {
        if (status.order >= chunkStatusList.done.order) {
            setStatus(chunkStatusList.changed)
        }
    }, [command])

    // Command change
    useEffect(() => {
        setCommand(chunk.command)
    }, [chunk.command])

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
            setButtonVariant('secondary')
        }
    }, [spark.status, status])

    // Verify if this schunk is in the running range of a run all above command
    useEffect(() => {
        if (spark.commandsToRun && spark.commandsToRun.includes(chunk._id)) {
            setResult(null)
            setStatus(chunkStatusList.running)
        }
    }, [spark.commandsToRun])

    // Listens for external run command
    useEffect(() => {
        if (spark.forceRun === chunk._id) {
            run()
        }
    }, [spark.forceRun])

    const startNameEdit = () => {
        nameRef.current.innerText = chunk.name || ''
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
        bookSocket.emit('chunk.name', index, name === '' ? undefined : name)
    }

    // Changes made during user edition
    const codeChange = value => {
        setCommand(value)
        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
        }
        saveTimer.current = setTimeout(() => {
            bookSocket.emit('chunk.update', index, value)
        }, 1000) // Saves after a second without changes
    }

    const doRun = () => {
        if (ready) {
            run()
        }
    }

    const run = () => {
        setResult(null)
        setStatus(chunkStatusList.running)

        let tmpResult = ''
        const doReturn = data => {
            tmpResult += data
            setResult(tmpResult)
        }

        const doFinish = () => {
            // TODO something when it's an error
            setStatus(chunkStatusList.done)
            spark.socket.off('return.stream', doReturn)
        }

        spark.socket.on('return.stream', doReturn)
        spark.socket.once('return', data => doFinish(data, false))
        spark.socket.once('return.error', data => doFinish(data, true))

        spark.run(index, command)
        setStatus(chunkStatusList.running)
    }

    const runAllAboveMe = () => {
        spark.runAllAbove(index)
    }

    const copy = () => {
        doCopy(chunkCopytext(index, chunk))
    }

    const remove = () => {
        bookSocket.emit('chunk.remove', index)
    }

    // TODO follow the up and down with the scroll

    const moveUp = () => {
        bookSocket.emit('chunk.move', index, index - 1)
    }

    const moveDown = () => {
        bookSocket.emit('chunk.move', index, index + 1)
    }

    return (
        <div>
            <ChunkAddButton at={index} bookSocket={bookSocket} />
            <div className='ml-3 mr-3'>
                <Card className={`command-block ${status.name} shadow`}>
                    <Card.Header className="d-flex align-items-start">
                        <div className="d-flex flex-column mr-2">
                            <FontAwesomeIcon icon="chevron-up"  size="xs" className="pointer" onClick={moveUp} />
                            <FontAwesomeIcon icon="chevron-down" size="xs" className="pointer" onClick={moveDown} />
                        </div>
                        <span onClick={startNameEdit} className="pointer">
                            [Chunk {index}]
                            <span
                                ref={nameRef}
                                contentEditable
                                spellCheck={false}
                                className="chunk-name ml-1 pr-1 pl-1"
                                onBlur={editName}
                                onKeyDown={editablePrevent}
                                style={{
                                    color: chunk.name ? 'gray' : 'rgba(128, 128, 128, 0.4)'
                                }}
                            >
                            </span>
                        </span>
                        <span className="flex-grow-1"></span>
                        <span>
                            <ChunkOptions index={index} runAllAbove={runAllAboveMe} copy={copy} remove={remove} />
                        </span>
                    </Card.Header>
                    <ChunkEditor index={index} command={command} codeChange={codeChange} run={doRun} runAllAbove={runAllAboveMe} />
                    <Card.Footer className="d-flex align-items-end">
                        <span className="chunk-status" style={{fontSize: '80%' ,...status.style}}>{status.label}</span>
                        <span className="flex-grow-1"></span>
                        <Button className="run-button" disabled={!ready} variant={buttonVariant} onClick={doRun}>
                            <FontAwesomeIcon icon={status.buttonIcon}  className={index === spark.runningNow ? 'hourglass-rotate' : ''}/>
                        </Button>
                    </Card.Footer>
                </Card>
                { result ? <CommandResult result={result} status={status}/> : null }
            </div>
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Chunk result
///////////////////////////////////////////////////////////////////////////////
const resultGrammar = {
    // Extracts the progress bar

    tableLine: { match: /\+[-+]+\+\n?/, lineBreaks: true },
    tableRow: {
        match: /^\|.*\|$\n?/,
        value: texto => {
            const columns = texto.split('|')
            return columns.slice(1, columns.length - 1)
                .map(coluna => coluna.trim())
        },
        lineBreaks: true
    },
    progress: {
        match: /\[Stage \d+:?=*>?\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
        value: text => {
            const numbers = /\(\d+\s?\+\s?\d+\)\s?\/\s?\d+/.exec(text)[0]
            // const actual = numbers.split('+')[0].replace('(', '').trim()
            const actual = eval(numbers.split('/')[0])
            const total = numbers.split('/')[1].trim()
            return {
                id: /Stage \d+/.exec(text)[0],
                numbers: numbers,
                progress: parseInt(actual) / parseInt(total) * 100
            }
        }
    },
    anything: { match: /.+/, lineBreaks: true },
    newLine: { match: /\n/, lineBreaks: true },
    error: moo.error
}

CommandResult.propTypes = {
    result: PropTypes.string,
    status: PropTypes.object
}
function CommandResult({ result, status }) {
    const [bars, setBars] = useState({})
    const [text, setText] = useState('')
    const [running, setRunning] = useState(true)
    const [tables, setTables] = useState([])

    // TODO Text not visible when the bar is too small

    // Tokenizing the result
    // Looking for progress bars and tables
    useEffect(() => {
        const lexer = moo.compile(resultGrammar)

        let extractedText = ''
        lexer.reset(result)

        let table = null
        const newTables = []
        const newBars = { ...bars }
        Array.from(lexer).forEach(token => {
            if (token.type === 'progress') {
                newBars[token.value.id] = token.value
            } else if (token.type === 'tableLine') {
                if (!table) {
                    table = { head: [] }
                    newTables.push(table)
                } else if (table.head && !table.body) {
                    table.body = []
                } else {
                    table = null
                }
            } else if (token.type === 'tableRow') {
                if (table && table.body) {
                    table.body.push(token.value)
                } else if (table && table.head) {
                    table.head.push(token.value)
                }
            } else {
                extractedText += token.text
            }
        })

        setBars(newBars)
        setTables(newTables)
        setText(extractedText)
    }, [result])

    useEffect(() => {
        if (status.executed) {
            setRunning(false)
        }
    }, [status])

    const makeRows = (rows) => {
        return rows.map((row, index) => (
            <tr key={index}>
                {row.map((column, index) => <td key={index}>{column}</td>)}
            </tr>
        ))
    }

    return (
        <div className="result-card mr-3 ml-3">
            { Object.values(bars).map(bar => (
                <ProgressBar
                    key={bar.id}
                    striped={running}
                    animated={running}
                    variant={running ? 'primary' : 'success'}
                    style={{ backgroundColor: 'rgb(231, 201, 146)' }}
                    className="mb-1"
                    label={`${bar.id}: ${bar.numbers}`} now={running ? bar.progress : 100}
                />
            )) }
            { tables.map((table, index) => (
                <Table key={index} striped size="sm" borderless>
                    <thead>
                        {makeRows(table.head)}
                    </thead>
                    <tbody>
                        {makeRows(table.body)}
                    </tbody>
                </Table>
            )) }
            { text }
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Button to add new chunk at a given position
///////////////////////////////////////////////////////////////////////////////

ChunkAddButton.propTypes = {
    at: PropTypes.number,
    bookSocket: PropTypes.object
}
function ChunkAddButton({ at, bookSocket}) {
    const add = () => {
        bookSocket.emit('chunk.new', at)
    }

    return (
        <div className="chunk-add-button mr-3 ml-3 mt-2 mb-2" onClick={add}>
            <FontAwesomeIcon icon="plus" />
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Spark connection handling
///////////////////////////////////////////////////////////////////////////////

const connectionStatusList = {
    disconnected: {
        class: 'disconnected',
        showControls: true,
        ready: false,
        canDisconnect: false
    },
    connecting: {
        class: 'connecting',
        showControls: false,
        ready: false,
        canDisconnect: false
    },
    connected: {
        class: 'connected',
        showControls: false,
        ready: true,
        canDisconnect: true
    },
    running: {
        class: 'running',
        showControls: false,
        ready: false,
        canDisconnect: true
    },
}

// Handles the connection, disconnection and running of chunks
function useSparkConnection(chunks) {
    const [connectionStatus, setConnectionStatus] = useState(connectionStatusList.disconnected)
    const [runningNow, setRunningNow] = useState(null)
    const [runningId, setRunningId] = useState(null)
    const [forceRun, setForceRun] = useState(null)
    const [commandsToRun, setCommandsToRun] = useState([])
    const sparkSocketRef = useRef(null)

    // Disconnects when leaving the component
    useEffect(() => {
        return () => {
            if (sparkSocketRef.current) {
                sparkSocketRef.current.disconnect()
            }
        }
    }, [])

    useEffect(() => {
        if (chunks) {
            const index = chunks.findIndex(chunk => chunk._id === runningId)
            setRunningNow(index === -1 ? null : index)
        } else {
            setRunningNow(null)
        }
    }, [chunks, runningId])

    const connect = (executors, cores, memory) => {
        sparkSocketRef.current = io(`/spark?executors=${executors}&cores=${cores}&memory=${memory}`)
        setConnectionStatus(connectionStatusList.connecting)

        sparkSocketRef.current.on('ready', () => {
            setConnectionStatus(connectionStatusList.connected)
        })
    }

    const disconnect = () => {
        if (sparkSocketRef.current) {
            sparkSocketRef.current.disconnect()
        }
        setRunningNow(null)
        setCommandsToRun([])
        setForceRun(null)
        sparkSocketRef.current = null
        setConnectionStatus(connectionStatusList.disconnected)
    }

    const run = (index, command) => {
        if (sparkSocketRef.current) {
            sparkSocketRef.current.once('return', () => {
                if (commandsToRun.length > 0) {
                // Run until part
                    setForceRun(commandsToRun.shift())
                    setCommandsToRun(commandsToRun)
                } else {
                // Normal run
                    setRunningId(null)
                    setConnectionStatus(connectionStatusList.connected)
                }
            })
            sparkSocketRef.current.emit('run', command)
            setRunningId(chunks[index]._id)
            setConnectionStatus(connectionStatusList.running)
        }
    }

    const runAllAbove = index => {
        const runList = chunks.slice(0, index).map(chunk => chunk._id)
        setForceRun(runList.shift())
        setCommandsToRun(runList)
    }

    return {
        socket: sparkSocketRef.current,
        status: connectionStatus,
        runningNow,
        commandsToRun,
        forceRun,
        connect,
        disconnect,
        run,
        runAllAbove
    }
}

///////////////////////////////////////////////////////////////////////////////
// Book Editor
///////////////////////////////////////////////////////////////////////////////
const SparkContext = React.createContext(null)

export function BookEditor() {
    const { bookId } = useParams()
    const [loading, setLoading] = useState(true)
    const [book, setBook] = useState(null)
    const bookSocketRef = useRef(null)
    const history = useHistory()
    const sparkConnection = useSparkConnection(book ? book.commands : null)

    // Connects to the book on valid ID
    // Also controls the exit commands
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

    // Copies all the chunks to the clipboard
    const copyAll = () => {
        const text = book.commands
            .map((chunk, index) => chunkCopytext(index, chunk))
            .join('\n\n')
        doCopy(text)
    }

    return (
        <SparkContext.Provider value={sparkConnection}>
            <LoadingHome loading={loading}>
                <EditorNavbar book={book} copyAll={copyAll} socket={bookSocketRef.current} />
                {((book && book.commands) || []).map((chunk, index) => (
                    <CommandChunk
                        chunk={chunk}
                        key={chunk._id}
                        index={index}
                        bookSocket={bookSocketRef.current}
                    />
                ))}
                <ChunkAddButton bookSocket={bookSocketRef.current} />
            </LoadingHome>
        </SparkContext.Provider>
    )
}