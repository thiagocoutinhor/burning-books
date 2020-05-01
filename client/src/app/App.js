import React, { useState, useEffect } from 'react';
import './App.css';
import { Login } from '../login/Login'
import { BookList } from '../book-list/BookList'
import { BookEditor } from '../book-editor/BookEditor'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Spinner } from 'react-bootstrap';

// TODO recieve socket logoff command

export function App(props) {
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

export function LoadingHome(props) {
  return (
    <>
      { props.loading ? (
        <div style={{ color: 'white', height: '100vh' }} className="d-flex flex-column justify-content-center">
          <div className="mx-auto text-center" style={{ width: '500px'}}>
            <Spinner animation="border" style={{ width: '10vh', height: '10vh' }}/>
            <div className="">Loading...</div>
          </div>
        </div>
      ) : (
        props.children
      )}
    </>
  )
}

function Home(props) {
 if (props.user) {
    return <BookList logoff={ props.logoff } />
  } else {
    return <Login />
  }
}