import React from 'react';
import './App.css';
import { Login } from '../login/Login'

export class App extends React.Component {
  render() {
    return (
      <div className="App-container">
        <Login />
      </div>
    )
  }
}