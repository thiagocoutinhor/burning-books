import React, { useState, useEffect } from 'react';
import './App.css';
import { Login } from '../login/Login'
import { BookList } from '../book-list/BookList'

// TODO control socket logoff command

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
    <div className="App-container">
      <Home user={ user } loading={ loading } logoff={ logoff } />
    </div>
  )
}

export function LoadingHome() {
  return (
    <div style={{ color: 'white', height: '100vh' }} className="d-flex flex-column justify-content-center">
      <div className="mx-auto text-center" style={{ width: '500px'}}>
        <div className="spinner-border" style={{ width: '10vh', height: '10vh' }}/>
        <div className="">Loading...</div>
      </div>
    </div>
  )
}

function Home(props) {
  if (props.loading) {
    return <LoadingHome />
  } else if (props.user) {
    return <BookList logoff={ props.logoff } />
  } else {
    return <Login />
  }
}