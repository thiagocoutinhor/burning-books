import React, { useState, useContext, useRef, useEffect } from 'react'
import { PropTypes } from 'prop-types'
import { Dropdown, Button, Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { CSSTransition } from 'react-transition-group'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import { SparkContext } from './BookEditor'
import './SparkConnectionControl.css'

function errorTooltip(props) {
    return (
        <Tooltip id="errorTooltip" {...props}>
            Connection refused! Try login off and on again.
        </Tooltip>
    )
}

function disconnectHandler(children, spark) {
    if (spark.status.canDisconnect) {
        return (
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    { children }
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item onClick={spark.disconnect}>
                        <FontAwesomeIcon icon="power-off" className="mr-2" />
                        Disconnect
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        )
    } else {
        return children
    }
}

///////////////////////////////////////////////////////////////////////////////
// Connection widget
///////////////////////////////////////////////////////////////////////////////
SparkConnectionControl.propTypes = {
    config: PropTypes.exact({
        executors: PropTypes.number,
        cores: PropTypes.number,
        memory: PropTypes.number,
    }),
    socket: PropTypes.object
}
export function SparkConnectionControl({ config, socket }) {
    const spark = useContext(SparkContext)
    const [lastRun, setLastRun] = useState(null)
    const executors = useRef()
    const cores = useRef()
    const memory = useRef()

    useEffect(() => {
        if (config) {
            if (executors.current) {
                executors.current.value = config.executors
            }
            if (cores.current) {
                cores.current.value = config.cores
            }
            if (memory.current) {
                memory.current.value = config.memory
            }
        }
    }, [config])

    useEffect(() => {
        if (spark.runningNow != null) {
            setLastRun(spark.runningNow)
        }
    }, [spark.runningNow])

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
        <div className={`d-flex align-items-center p-2 connection-control ${spark.status.class}`}>
            <CSSTransition
                classNames="connection-animate"
                in={spark.status.showControls}
                timeout={400}
            >
                <Form as="div" inline className="flex-nowrap" style={{ overflow: 'hidden' }}>
                    { controls.map((control, index) => (
                        <InputGroup size="sm" className="mr-2 flex-nowrap" key={index}>
                            <InputGroup.Prepend>
                                <InputGroup.Text>{control.name}</InputGroup.Text>
                            </InputGroup.Prepend>
                            <Form.Control ref={control.ref} onChange={changeConfig} type="number" defaultValue="2" className="text-center" min="1" style={{ width: '4em' }}></Form.Control>
                        </InputGroup>
                    )).concat((
                        <Button size="sm" className="mr-2" onClick={connect} key="connectButton">Connect</Button>
                    )) }
                </Form>
            </CSSTransition>
            <CSSTransition
                classNames="connection-animate"
                in={spark.runningNow != null}
                unmountOnExit
                timeout={400}
            >
                <div className="mr-2 text-nowrap" style={{ overflow: 'hidden' }}>
                    <FontAwesomeIcon icon="spinner" className="mr-2 text-primary rotate" />
                    Running Chunk { lastRun  }
                </div>
            </CSSTransition>
            { disconnectHandler((
                <div className="connection-icon">
                    { spark.status.isError ? (
                        <OverlayTrigger
                            placement="left"
                            overlay={errorTooltip}
                        >
                            <FontAwesomeIcon icon="exclamation-triangle" />
                        </OverlayTrigger>
                    ) : (
                        <FontAwesomeIcon icon="wifi" />
                    )}
                </div>
            ), spark) }
        </div>
    )
}