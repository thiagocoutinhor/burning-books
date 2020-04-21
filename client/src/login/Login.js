import React from 'react'

export class Login extends React.Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    componentDidMount() {
        fetch('/api/login/type')
            .then(response => response.text())
            .then(type => this.setState({ type: type }))
    }

    render() {
        return (
            <form action="/api/login" method="POST" encType="multipart/form-data" className="d-flex flex-column justify-content-center" style={{height: '100vh'}}>
                <div className="card mx-auto shadow" style={{width: "500px"}}>
                    <div className="card-body">
                        <h3 className="card-title text-center">Burning Books</h3>

                        <div>
                            <label>Login:</label>
                            <input className="form-control" type="text" name="login"/>
                            <LoginType type={this.state.type}/>
                        </div>

                        <div>
                            <input type="submit" className="btn btn-primary w-100 mt-3" value="Entrar"/>
                        </div>
                    </div>
                </div>
            </form>
        )
    }
}

function LoginType(props) {
    if (props.type === 'PASSWORD') {
        return (
            <div className="password-login">
                <br/>
                <label>Senha:</label>
                <input className="form-control" type="password" name="password"/>
            </div>
        )
    } else if (props.type === 'SSH') {
        return(
            <div className="token-login">
                <br/>
                <label>SSH Key:</label>
                <input className="form-control-file" type="file" name="token"/>
            </div>
        )
    } else {
        return (
            <div>
                Unkown login type... Please, check the LOGIN_TYPE enviroment variable.
            </div>
        )
    }
}