import React, { useState, useEffect, useRef } from 'react'
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import { useParams, useHistory } from 'react-router-dom'
import PropTypes from 'prop-types'
import io from 'socket.io-client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './BookEditor.css'
import { LoadingHome } from '../app/App'
import { doCopy, chunkCopytext } from './helper'
import { EditorNavbar } from './BookEditorNavbar'
import { CommandChunk } from './CommandChunk'
import { useSparkConnection } from './useSparkConnection'

///////////////////////////////////////////////////////////////////////////////
// Button to add new chunk at a given position
///////////////////////////////////////////////////////////////////////////////

ChunkAddButton.propTypes = {
    at: PropTypes.number,
    bookSocket: PropTypes.object
}
export function ChunkAddButton({ at, bookSocket}) {
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
        bookSocketRef.current.on('logoff', () => {
            console.log('Teste')
            history.push('/')
        })

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
                <TransitionGroup>
                    {((book && book.commands) || []).map((chunk, index) => (
                        <CSSTransition
                            key={chunk._id}
                            classNames="chunk-animate"
                            timeout={500}
                            unmountOnExit
                        >
                            <CommandChunk
                                chunk={chunk}
                                index={index}
                                bookSocket={bookSocketRef.current}
                            />
                        </CSSTransition>
                    ))}
                </TransitionGroup>
                <ChunkAddButton bookSocket={bookSocketRef.current} />
            </LoadingHome>
        </SparkContext.Provider>
    )
}