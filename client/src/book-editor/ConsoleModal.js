import React, { useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Modal } from 'react-bootstrap'
import { SparkContext } from './BookEditor'
import './ConsoleModal.css'

ConsoleModal.propTypes = {
    show: PropTypes.bool,
    close: PropTypes.func.isRequired
}
export function ConsoleModal({ show, close }) {
    const spark = useContext(SparkContext)
    const [text, setText] = useState(null)

    useEffect(() => {
        console.log('Banana iniciou')
        if (spark.socket) {
            let textAgg = ''
            spark.socket.on('console', data => {
                console.log('Banana >', textAgg)
                textAgg += data
                setText(textAgg)
            })
        }
    }, [spark.socket])

    return (
        <Modal dialogClassName="console-dialog" show={show} onHide={close}>
            <Modal.Header closeButton>
                <Modal.Title className="h6">Console</Modal.Title>
            </Modal.Header>
            <Modal.Body className="console">
                { text }
            </Modal.Body>
        </Modal>
    )
}