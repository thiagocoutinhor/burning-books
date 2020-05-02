import React, { useState, useEffect } from 'react'
import './App.css'
import { Login } from '../login/Login'
import { BookList } from '../book-list/BookList'
import { BookEditor } from '../book-editor/BookEditor'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import PropTypes from 'prop-types'

// TODO recieve socket logoff command

///////////////////////////////////////////////////////////////////////////////
// App root component
///////////////////////////////////////////////////////////////////////////////
export function App() {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        fetch('/api/login')
            .then(response => response.status === 200 ? response.text() : null)
            .then(user => {
                setUser(user)
                setLoading(false)
            })
    }, [])

    const logoff = () => {
        fetch('/api/login', { method: 'DELETE' })
        setUser(null)
    }

    return (
        <BrowserRouter>
            <Switch>
                <Route path="/book/:bookId">
                    <BookEditor />
                </Route>
                <Route path="/">
                    <LoadingHome loading={loading}>
                        <Home user={ user } logoff={ logoff } />
                    </LoadingHome>
                </Route>
            </Switch>
        </BrowserRouter>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Loading component, show an spinner while loading
///////////////////////////////////////////////////////////////////////////////
LoadingHome.propTypes = {
    loading: PropTypes.bool.isRequired,
    children: PropTypes.arrayOf(PropTypes.element)
}
export function LoadingHome({ loading, children }) {
    return (
        <>
            { loading ? (
                <div style={{ color: 'white', height: '100vh' }} className="d-flex flex-column justify-content-center">
                    <div className="mx-auto text-center" style={{ width: '500px'}}>
                        <Spinner animation="border" style={{ width: '10vh', height: '10vh' }}/>
                        <div className="">Loading...</div>
                    </div>
                </div>
            ) : (
                children
            )}
        </>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Show the book list or the login page, depending on the login status
///////////////////////////////////////////////////////////////////////////////
Home.propTypes = {
    user: PropTypes.object,
    logoff: PropTypes.func.isRequired
}
function Home({ user, logoff }) {
    return user ? (<BookList logoff={ logoff } />) : (<Login />)
}