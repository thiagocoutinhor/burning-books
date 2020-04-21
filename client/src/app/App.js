import React from 'react';
import './App.css';
import { Login } from '../login/Login'
import { BookList } from '../book-list/BookList'

// TODO control socket logoff command

export class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      user: null
    }
    this.logoff = this.logoff.bind(this)
  }

  componentDidMount() {
    fetch('/api/login')
      .then(response => response.status === 200 ? response.text() : null)
      .then(user => {
        this.setState({
          user,
          loading: false
        })
      })
  }

  render() {
    return (
      <div className="App-container">
        <Home user={ this.state.user } loading={ this.state.loading } logoff={ this.logoff } />
      </div>
    )
  }

  logoff() {
    fetch('/api/login', { method: 'DELETE' })
    this.setState({ user: null })
  }

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