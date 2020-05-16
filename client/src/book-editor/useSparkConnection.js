import { useState, useRef, useEffect } from 'react'
import io from 'socket.io-client'

///////////////////////////////////////////////////////////////////////////////
// Spark connection handling
///////////////////////////////////////////////////////////////////////////////

const connectionStatusList = {
    error: {
        class: 'disconnected',
        showControls: true,
        ready: false,
        isConnected: false,
        canDisconnect: false,
        isError: true
    },
    disconnected: {
        class: 'disconnected',
        showControls: true,
        ready: false,
        isConnected: false,
        canDisconnect: false,
        isError: false
    },
    connecting: {
        class: 'connecting',
        showControls: false,
        ready: false,
        isConnected: false,
        canDisconnect: false,
        isError: false
    },
    connected: {
        class: 'connected',
        showControls: false,
        ready: true,
        isConnected: true,
        canDisconnect: true,
        isError: false
    },
    running: {
        class: 'running',
        showControls: false,
        ready: false,
        isConnected: true,
        canDisconnect: true,
        isError: false
    },
}

// Handles the connection, disconnection and running of chunks
export function useSparkConnection(chunks) {
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

        sparkSocketRef.current.on('connect.error', () => {
            setConnectionStatus(connectionStatusList.error)
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