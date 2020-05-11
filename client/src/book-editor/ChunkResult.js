import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { ProgressBar, Table } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moo from 'moo'
import moment from 'moment'
import './ChunkResult.css'
import { doCopy } from './helper'

///////////////////////////////////////////////////////////////////////////////
// Chunk result
///////////////////////////////////////////////////////////////////////////////
const resultGrammar = {
    // Extracts the tables
    tableLine: /\+[-+]+\+/,
    tableRow: {
        match: /\|.*\|/,
        value: texto => {
            const columns = texto.split('|')
            return columns.slice(1, columns.length - 1)
                .map(coluna => coluna.trim())
        }
    },
    // Extracts the progress bar
    progress: {
        match: /\[Stage \d+:?=*>?\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
        value: text => {
            const numbers = /\(\d+\s?\+\s?\d+\)\s?\/\s?\d+/.exec(text)[0]
            const actual = eval(numbers.split('/')[0])
            const total = numbers.split('/')[1].trim()
            return {
                id: /Stage \d+/.exec(text)[0],
                numbers: numbers,
                progress: parseInt(actual) / parseInt(total) * 100
            }
        }
    },
    anything: /.+/,
    newLine: { match: /[\n\r]/, lineBreaks: true },
    error: moo.error
}

ChunkResult.propTypes = {
    result: PropTypes.string,
    status: PropTypes.object,
    removeResult: PropTypes.func
}
export function ChunkResult({ result, status, removeResult }) {
    const [bars, setBars] = useState({})
    const [text, setText] = useState('')
    const [running, setRunning] = useState(true)
    const [tables, setTables] = useState([])
    const [runAt, setRunAt] = useState()

    useEffect(() => {
        setRunAt(moment().format('HH:mm:ss.SSS'))
    }, [])

    // TODO Text not visible when the progress bar is too small

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
        if (rows) {
            return rows.map((row, index) => (
                <tr key={index}>
                    {row.map((column, index) => <td key={index}>{column}</td>)}
                </tr>
            ))
        } else {
            return null
        }
    }

    return (
        <div className="result-card mr-3 ml-3">
            <div className="d-flex mb-1">
                <span>{runAt}</span>
                <span className="flex-grow-1" />
                { running ? null : (
                    <span>
                        <FontAwesomeIcon icon="times" className="pointer" onClick={removeResult} />
                    </span>
                )}
            </div>
            { Object.values(bars).reverse().map(bar => (
                <ProgressBar
                    key={bar.id}
                    striped={running && bar.progress < 100}
                    animated={running && bar.progress < 100}
                    variant={running && bar.progress < 100 ? 'primary' : 'success'}
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
