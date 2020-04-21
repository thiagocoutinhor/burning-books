import React from 'react';
import './App.css';
import { Login } from '../login/Login'
import { BookList } from '../book-list/BookList'

export class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      user: null
    }
  }

  componentDidMount() {
    fetch('/api/login')
      .then(response => response.text())
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
        <Home user={ this.state.user } loading={ this.state.loading } />
      </div>
    )
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
    return <BookList />
  } else {
    return <Login />
  }
}