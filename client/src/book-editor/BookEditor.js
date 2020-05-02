import React, { useState, useEffect, useRef, useContext } from 'react'
import PropTypes from 'prop-types'
import { useParams, useHistory, Link } from 'react-router-dom'
import { Navbar, Dropdown, Card, Button, Form, InputGroup, ProgressBar } from 'react-bootstrap'
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
ConnectionControl.propTypes = {
    className: PropTypes.string
}
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
EditorNavbar.propTypes = {
    book: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string
    }),
    socket: PropTypes.object,
    copyAll: PropTypes.func
}
function EditorNavbar({ book, socket, copyAll }) {
    return (
        <Navbar variant="dark" className="sticky-top d-flex shadow">
            <Navbar.Brand>
                <Link to="/">
                    <FontAwesomeIcon icon="chevron-left"/>
                </Link>
                <span className="ml-1">
                    { book.name }
                </span>
            </Navbar.Brand>
            <div className="flex-grow-1"/>
            <ConnectionControl socket={socket} className="mr-2"/>
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
    copy: PropTypes.func,
    runAllAbove: PropTypes.func,
    remove: PropTypes.func,
}
function ChunkOptions({ copy, runAllAbove, remove}) {
    const spark = useContext(SparkContext)

    return (
        <Dropdown drop="left">
            <Dropdown.Toggle as={SimpleDropdown}>
                <FontAwesomeIcon icon="ellipsis-v" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item onClick={copy}>
                    <FontAwesomeIcon icon="clone" className="mr-2"/>
                    Copy
                </Dropdown.Item>
                <Dropdown.Item as="button" onClick={runAllAbove} disabled={!spark.status.ready}>
                    <FontAwesomeIcon icon="play" className="mr-2"/>
                    Run all above
                </Dropdown.Item>
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
        buttonVariant: 'success',
        buttonIcon: 'play'
    }
}

// Each code chunk
CommandChunk.propTypes = {
    index: PropTypes.number,
    chunk: PropTypes.shape({
        name: PropTypes.string,
        command: PropTypes.string
    }),
    showRunning: PropTypes.bool,
    bookSocket: PropTypes.object
}
function CommandChunk({ index, chunk, showRunning = false, bookSocket }) {
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

    useEffect(() => {
        // TODO something
        if (showRunning) {
            setStatus(chunkStatusList.running)
        }
    }, [showRunning])

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
            bookSocket.emit('chunk.update', index, value)
        }, 1000) // Saves after a second without changes
    }

    const run = () => {
        if (ready) {
            setResult(null)
            setStatus(chunkStatusList.running)

            let tmpResult = ''
            const doReturn = data => {
                tmpResult += data
                setResult(tmpResult)
            }

            const doFinish = (data, isError) => {
                // TODO something when it's an error
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

    const runAllAboveMe = () => {
        // TODO something
    }

    const copy = () => {
        doCopy(chunkCopytext(index, chunk))
    }

    const remove = () => {
        console.log('Teste')
        bookSocket.emit('chunk.remove', index)
    }

    return (
        <div>
            <ChunkAddButton at={index} bookSocket={bookSocket} />
            <div className='ml-3 mr-3'>
                <Card className={`command-block ${status.name} shadow`}>
                    <Card.Header className="d-flex align-items-start">
                        <span onClick={startNameEdit} className="pointer">
                            [Chunk {index}]
                            <span
                                ref={nameRef}
                                contentEditable
                                spellCheck={false}
                                className="chunk-name ml-1 pr-1 pl-1"
                                onBlur={editName}
                                onKeyDown={treatName}
                                style={{
                                    color: chunk.name ? 'gray' : 'rgba(128, 128, 128, 0.4)'
                                }}
                            >
                            </span>
                        </span>
                        <span className="flex-grow-1"></span>
                        <span>
                            <ChunkOptions runAllAbove={runAllAboveMe} copy={copy} remove={remove} />
                        </span>
                    </Card.Header>
                    <ChunkEditor index={index} command={command} codeChange={codeChange} run={run} runAllAbove={runAllAboveMe} />
                    <Card.Footer className="d-flex align-items-end">
                        <span className="chunk-status" style={{fontSize: '80%' ,...status.style}}>{status.label}</span>
                        <span className="flex-grow-1"></span>
                        <Button className="run-button" disabled={!ready} variant={buttonVariant} onClick={run} style={{ verticalAlign: 'middle' }}>
                            <FontAwesomeIcon icon={status.buttonIcon} />
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
    progress: {
        match: /\[Stage \d+:?=*>?\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
        value: text => {
            const numbers = /\(\d+\s?\+\s?\d+\)\s?\/\s?\d+/.exec(text)[0]
            const actual = numbers.split('+')[0].replace('(', '').trim()
            const total = numbers.split('/')[1].trim()
            return {
                id: /Stage \d+/.exec(text)[0],
                numbers: numbers,
                progress: parseInt(actual) / parseInt(total) * 100
            }
        }
    },
    error: moo.error
}

CommandResult.propTypes = {
    result: PropTypes.string,
    status: PropTypes.object
}
function CommandResult({ result, status }) {
    const [bars, setBars] = useState({})
    const [text, setText] = useState('')

    // Tokenizing the result
    // Looking for progress bars and tables
    useEffect(() => {
        const lexer = moo.compile(resultGrammar)

        let extractedText = ''
        lexer.reset(result)

        const newBars = { ...bars }
        Array.from(lexer).forEach(token => {
            if (token.type === 'progress') {
                newBars[token.value.id] = token.value
            } else {
                extractedText += token.text
            }
        })

        setBars(newBars)
        setText(extractedText)
    }, [result])

    // TODO add tables

    return (
        <div className="result-card mr-3 ml-3">
            { Object.values(bars).map(bar => (
                <ProgressBar
                    key={bar.id}
                    striped={!status.executed}
                    animated={!status.executed}
                    variant={status.executed ? 'success' : 'primary'}
                    style={{ backgroundColor: 'rgb(231, 201, 146)' }}
                    className="mb-1"
                    label={`${bar.id}: ${bar.numbers}`} now={status.executed ? 100 : bar.progress}
                />
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
// Book Editor
///////////////////////////////////////////////////////////////////////////////

export function BookEditor() {
    const { bookId } = useParams()
    const [spark, setSpark] = useState({
        status: connectionStatusList.disconnected,
        socket: null,
        connect: (executors, cores, memory) => {
            spark.socket = io(`/spark?executors=${executors}&cores=${cores}&memory=${memory}`)
            setSpark({ status: connectionStatusList.connecting })

            spark.socket.on('ready', () => {
                setSpark({ ...spark, status: connectionStatusList.connected })
            })
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
    const [loading, setLoading] = useState(true)
    const [book, setBook] = useState(null)
    const [runningAllUntil, setrunningAllUntil] = useState(null)
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

    const copyAll = () => {
        const text = book.commands
            .map((chunk, index) => chunkCopytext(index, chunk))
            .join('\n\n')
        doCopy(text)
    }

    const runAllAbove = index => {
        console.log(spark.status)
        console.log(`Banana => ${index}`)
        setrunningAllUntil(index - 1)
        // TODO something
    }

    return (
        <SparkContext.Provider value={spark}>
            <LoadingHome loading={loading}>
                <EditorNavbar book={book} copyAll={copyAll}/>
                {((book && book.commands) || []).map((chunk, index) => (
                    <CommandChunk
                        chunk={chunk}
                        key={chunk._id}
                        index={index}
                        bookSocket={bookSocketRef.current}
                        runing={runningAllUntil != null && index <= runningAllUntil}
                    />
                ))}
                <ChunkAddButton bookSocket={bookSocketRef.current} />
            </LoadingHome>
        </SparkContext.Provider>
    )
}