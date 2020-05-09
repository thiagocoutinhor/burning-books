import React, { useState, useEffect, useRef, useContext } from 'react'
import PropTypes from 'prop-types'
import { useParams, useHistory } from 'react-router-dom'
import { Dropdown, Card, Button } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'
import { LoadingHome } from '../app/App'
import AceEditor from 'react-ace'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { doCopy, chunkCopytext, editablePrevent } from './helper'
import { EditorNavbar } from './BookEditorNavbar'
import { ChunkResult } from './ChunkResult'
import './BookEditor.css'

// Ace editor imports
import 'ace-builds/src-noconflict/mode-scala'
import 'ace-builds/src-noconflict/theme-textmate'
import 'ace-builds/src-min-noconflict/ext-searchbox'
import 'ace-builds/src-min-noconflict/ext-language_tools'

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
                        mac: 'Command-shift-Enter'
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

    // TODO not working when the editor sends it
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
                { result ? <ChunkResult result={result} status={status}/> : null }
            </div>
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
export const SparkContext = React.createContext(null)

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